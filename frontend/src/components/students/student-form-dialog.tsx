import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, RotateCcw, UserPlus, X } from "lucide-react";
import {
  Controller,
  useFieldArray,
  useForm,
  type DefaultValues,
} from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEnrollmentStore } from "@/lib/enrollment-store";
import {
  createStudentFormSchema,
  interestOptions,
  MAX_EMAILS,
  type StudentFormValues,
} from "@/lib/schemas/student-schema";
import type { Student } from "@/lib/types";

const programOptions = [
  { value: "CPE", label: "CPE — วิศวกรรมคอมพิวเตอร์" },
  { value: "ISNE", label: "ISNE — วิศวกรรมระบบสารสนเทศและเครือข่าย" },
];

const emptyStudentForm: DefaultValues<StudentFormValues> = {
  studentId: "",
  firstName: "",
  lastName: "",
  program: undefined,
  interests: [],
  emails: [{ address: "" }],
};

const toFormValues = (s: Student): DefaultValues<StudentFormValues> => ({
  studentId: s.studentId,
  firstName: s.firstName,
  lastName: s.lastName,
  program: s.program,
  interests: s.interests ?? [],
  emails: s.emails?.length ? s.emails : [{ address: "" }],
});

export function StudentFormDialog({ student }: { student?: Student }) {
  const isEdit = student !== undefined;
  const addStudent = useEnrollmentStore((s) => s.addStudent);
  const updateStudent = useEnrollmentStore((s) => s.updateStudent);
  const students = useEnrollmentStore((s) => s.students);
  const [open, setOpen] = useState(false);

  const initialValues = isEdit ? toFormValues(student) : emptyStudentForm;

  const schema = useMemo(
    () => createStudentFormSchema(students, student?.studentId),
    [students, student?.studentId],
  );

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
    mode: "onBlur", // เช็ก error ตอนออกจากช่อง (กวนน้อยกว่า onChange)
  });

  // ─── useFieldArray ───
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "emails",
  });

  const emailsError =
    form.formState.errors.emails?.root ?? form.formState.errors.emails;

  const resetForm = () => form.reset(initialValues);

  async function onSubmit(values: StudentFormValues) {
    try {
      if (isEdit)
        await updateStudent(values); // PUT
      else await addStudent(values); // POST
      form.reset(isEdit ? values : emptyStudentForm);
      setOpen(false);
    } catch (err) {
      form.setError("root", { message: (err as Error).message });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        resetForm();
      }}
    >
      {isEdit ? (
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={`แก้ไขนักศึกษา ${student.studentId}`}
            />
          }
        >
          <Pencil className="h-4 w-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button />}>
          <UserPlus className="h-4 w-4" />
          เพิ่มนักศึกษา
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>
              {isEdit
                ? `แก้ไขนักศึกษา ${student.studentId}`
                : "เพิ่มนักศึกษาใหม่"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "แก้ชื่อ นามสกุล หลักสูตร ความสนใจ หรืออีเมลได้ — รหัสนักศึกษาแก้ไม่ได้"
                : "ลองเว้นช่องว่าง ใส่รหัสนักศึกษาไม่ครบ 9 หลัก ใส่รหัสที่มีอยู่แล้ว หรือไม่เลือกความสนใจเลย แล้วกดบันทึก"}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <Controller
              name="studentId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="studentId">รหัสนักศึกษา</FieldLabel>
                  <Input
                    {...field}
                    id="studentId"
                    placeholder={student?.studentId}
                    inputMode="numeric"
                    disabled={isEdit}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="firstName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="firstName">ชื่อ</FieldLabel>
                    <Input
                      {...field}
                      id="firstName"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="lastName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="lastName">นามสกุล</FieldLabel>
                    <Input
                      {...field}
                      id="lastName"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>

            <Controller
              name="program"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="program">หลักสูตร</FieldLabel>
                  <Select
                    name={field.name}
                    items={programOptions}
                    value={field.value ?? null}
                    onValueChange={(v) => {
                      field.onChange(v);
                      field.onBlur(); // Select ไม่มี blur ชัดเจน — ถือว่าแตะแล้วตั้งแต่เลือก
                    }}
                  >
                    <SelectTrigger
                      id="program"
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                      ref={field.ref}
                    >
                      <SelectValue placeholder="เลือกหลักสูตร" />
                    </SelectTrigger>
                    <SelectContent>
                      {programOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="interests"
              control={form.control}
              render={({ field, fieldState }) => (
                <FieldSet data-invalid={fieldState.invalid}>
                  <FieldLegend variant="label">
                    ความสนใจ (Checkbox หลายตัว)
                  </FieldLegend>
                  <FieldDescription>เลือก 1–3 ด้าน</FieldDescription>
                  <FieldGroup data-slot="checkbox-group" className="gap-3">
                    {interestOptions.map((item) => (
                      <Field
                        key={item.id}
                        orientation="horizontal"
                        data-invalid={fieldState.invalid}
                      >
                        <Checkbox
                          id={`interest-${item.id}`}
                          name={field.name}
                          aria-invalid={fieldState.invalid}
                          checked={field.value.includes(item.id)}
                          onCheckedChange={(checked) => {
                            field.onChange(
                              checked
                                ? [...field.value, item.id]
                                : field.value.filter((id) => id !== item.id),
                            );
                            field.onBlur(); // Checkbox ไม่มี blur ชัดเจน — ถือว่าแตะแล้ว
                          }}
                        />
                        <FieldLabel
                          htmlFor={`interest-${item.id}`}
                          className="font-normal"
                        >
                          {item.label}
                        </FieldLabel>
                      </Field>
                    ))}
                  </FieldGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </FieldSet>
              )}
            />

            <FieldSet data-invalid={!!emailsError?.message}>
              <FieldLegend variant="label">อีเมล</FieldLegend>
              <FieldDescription>
                {fields.length}/{MAX_EMAILS} อีเมล — ห้ามซ้ำกัน
              </FieldDescription>

              <FieldGroup className="gap-3">
                {/* key ต้องใช้ item.id (ที่ useFieldArray สร้างให้) ไม่ใช่ index */}
                {fields.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <span className="mt-1.5 w-5 shrink-0 text-sm text-muted-foreground">
                      {index + 1}.
                    </span>
                    <Controller
                      name={`emails.${index}.address`}
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field
                          data-invalid={fieldState.invalid}
                          className="flex-1"
                        >
                          <FieldContent>
                            <Input
                              {...field}
                              id={`email-${index}`}
                              type="email"
                              placeholder="name@cmu.ac.th"
                              aria-label={`อีเมลที่ ${index + 1}`}
                              aria-invalid={fieldState.invalid}
                            />
                            {fieldState.invalid && (
                              <FieldError errors={[fieldState.error]} />
                            )}
                          </FieldContent>
                        </Field>
                      )}
                    />
                    {/* ─── remove(index) ─── */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`ลบอีเมลที่ ${index + 1}`}
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </FieldGroup>

              {emailsError?.message && <FieldError errors={[emailsError]} />}

              {/* ─── append({...}) ─── */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                disabled={fields.length >= MAX_EMAILS}
                onClick={() => append({ address: "" })}
              >
                <Plus className="size-4" />
                เพิ่มอีเมล
              </Button>
            </FieldSet>
          </FieldGroup>

          {form.formState.errors.root && (
            <FieldError errors={[form.formState.errors.root]} />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={resetForm}>
              <RotateCcw className="h-4 w-4" />
              {isEdit ? "คืนค่าเดิม" : "ล้างฟอร์ม"}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
